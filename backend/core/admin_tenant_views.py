# backend/core/admin_tenant_views.py
"""
Vistas del panel de superadmin para gestión cross-tenant de NERBIS.

Este módulo está aislado por diseño (complementa a ``admin_views.py``):
- NO referencia ``request.tenant``.
- NO exige el header ``X-Tenant-Slug`` (queda fuera por ``TenantExclusionMiddleware``).
- Usa filtros ORM explícitos (``Tenant.objects.all()`` / ``User.objects.filter(...)``)
  en vez de depender del auto-filtrado por tenant (que ya queda inactivo porque
  la ruta ``/api/admin/*`` está excluida del contexto de tenant).
- Toda acción destructiva registra una entrada en ``AdminAuditLog``.

Contrato de sub-agente SDD ``sdd/tenant-user-management`` (Issue #110, Phase 2).
"""

from __future__ import annotations

import logging

from django.db.models import Count, Q, QuerySet
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.admin_tenant_serializers import (
    AdminTenantDetailSerializer,
    AdminTenantListSerializer,
    AdminTenantUpdateSerializer,
    AdminTenantUserSerializer,
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
)
from core.models import AdminAuditLog, Tenant, User
from core.permissions import IsSuperAdmin
from core.utils import get_client_ip

logger = logging.getLogger(__name__)


class AdminPagination(PageNumberPagination):
    """Paginación estándar para endpoints del panel de superadmin.

    Mismo contrato que ``AdminSuperadminPagination`` en ``admin_views.py``.
    No reutilizamos directamente el import para mantener el módulo aislado
    y evitar acoplamiento accidental.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_bool(value: str | None) -> bool | None:
    """Interpreta los valores típicos de query params como booleanos.

    Retorna ``None`` cuando el valor no es reconocible — el caller decide
    si ignorarlo o devolver 400.
    """
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes"}:
        return True
    if normalized in {"false", "0", "no"}:
        return False
    return None


# ---------------------------------------------------------------------------
# Tenant list view
# ---------------------------------------------------------------------------


class AdminTenantListView(generics.ListAPIView):
    """GET ``/api/admin/tenants/`` — Listado paginado cross-tenant.

    Filtros soportados vía query params:
      - ``is_active`` (true/false)
      - ``plan`` (trial/basic/professional/enterprise)
      - ``search`` (coincidencia parcial case-insensitive sobre name/slug/email)
      - ``ordering`` (name, -name, created_at, -created_at, plan, -plan) —
        default ``-created_at``.

    Anota ``user_count`` en cada tenant para que el serializer no dispare
    consultas N+1.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = AdminPagination
    serializer_class = AdminTenantListSerializer

    ALLOWED_ORDERING = {
        "name",
        "-name",
        "created_at",
        "-created_at",
        "plan",
        "-plan",
    }

    def get_queryset(self) -> QuerySet[Tenant]:
        # ``Tenant.objects.all()`` es seguro aquí: ``/api/admin/*`` queda
        # excluido del contexto de tenant y no es ``TenantAwareModel``.
        qs = Tenant.objects.all().annotate(user_count=Count("users"))

        params = self.request.query_params

        is_active = _parse_bool(params.get("is_active"))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        plan = params.get("plan")
        if plan:
            qs = qs.filter(plan=plan)

        search = params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search) | Q(email__icontains=search))

        ordering = params.get("ordering")
        if ordering in self.ALLOWED_ORDERING:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("-created_at")

        return qs


# ---------------------------------------------------------------------------
# Tenant detail view
# ---------------------------------------------------------------------------


class AdminTenantDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH ``/api/admin/tenants/<uuid:pk>/``.

    - GET devuelve el detalle completo (con ``user_count`` y ``admin_count``
      anotados).
    - PATCH acepta únicamente campos del allowlist
      (``AdminTenantUpdateSerializer``). Cambios en ``is_active`` generan
      una entrada en ``AdminAuditLog``. Otros cambios (plan, feature flags,
      fecha de suscripción) se persisten pero no son destructivos, por lo que
      no se registran en el audit log (ver contrato del design doc).
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    lookup_field = "pk"
    serializer_class = AdminTenantDetailSerializer

    def get_queryset(self) -> QuerySet[Tenant]:
        return Tenant.objects.all().annotate(
            user_count=Count("users"),
            admin_count=Count("users", filter=Q(users__role="admin")),
        )

    # GET usa el serializer_class por defecto.
    # PATCH necesita: validar con AdminTenantUpdateSerializer (allowlist),
    # aplicar los cambios, registrar audit log y responder con el detalle
    # completo vía AdminTenantDetailSerializer.
    def partial_update(self, request, *args, **kwargs):
        tenant = self.get_object()
        serializer = AdminTenantUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        if not validated:
            # Nada que actualizar — retornamos el detalle tal cual.
            return Response(
                AdminTenantDetailSerializer(tenant).data,
                status=status.HTTP_200_OK,
            )

        previous_is_active = tenant.is_active
        update_fields: list[str] = []

        for field, value in validated.items():
            setattr(tenant, field, value)
            update_fields.append(field)

        tenant.save(update_fields=update_fields)

        # Audit trail sólo para transiciones de is_active.
        if "is_active" in validated and previous_is_active != validated["is_active"]:
            action = (
                AdminAuditLog.ACTION_ACTIVATE_TENANT
                if validated["is_active"]
                else AdminAuditLog.ACTION_DEACTIVATE_TENANT
            )
            try:
                AdminAuditLog.objects.create(
                    actor=request.user,
                    action=action,
                    target_type="Tenant",
                    target_id=str(tenant.id),
                    target_repr=f"tenant: {tenant.slug}",
                    details={
                        "previous_is_active": previous_is_active,
                        "new_is_active": validated["is_active"],
                    },
                    ip_address=get_client_ip(request),
                )
            except Exception:  # pragma: no cover — defensivo, no bloquea la acción
                logger.exception(
                    "Failed to write AdminAuditLog for tenant %s action=%s",
                    tenant.id,
                    action,
                )

        # Re-anotar para incluir user_count/admin_count en la respuesta.
        refreshed = self.get_queryset().get(pk=tenant.pk)
        return Response(
            AdminTenantDetailSerializer(refreshed).data,
            status=status.HTTP_200_OK,
        )

    # DRF llama a ``put`` en RetrieveUpdateAPIView; desactivamos PUT
    # explícitamente para reforzar el contrato "sólo PATCH con allowlist".
    def put(self, request, *args, **kwargs):
        return Response(
            {"detail": 'Method "PUT" not allowed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


# ---------------------------------------------------------------------------
# Tenant users list view — Phase 3 (Issue #110)
# ---------------------------------------------------------------------------


class AdminTenantUsersListView(generics.ListAPIView):
    """GET ``/api/admin/tenants/<uuid:pk>/users/`` — usuarios de un tenant.

    Listado paginado de los usuarios asociados a un tenant específico.
    Responde 404 si el tenant no existe.

    Filtros soportados vía query params:
      - ``role`` (admin/staff/customer)
      - ``is_active`` (true/false)
      - ``search`` (coincidencia parcial sobre email/first_name/last_name)
      - ``ordering`` (last_login, -last_login, date_joined, -date_joined,
        email, -email) — default ``-date_joined``.

    Filtro explícito vía ``User.objects.filter(tenant_id=<uuid>)`` — NO nos
    apoyamos en el ``TenantAwareUserManager`` porque el contexto de tenant
    ya fue desactivado por ``TenantExclusionMiddleware``. Ser explícitos aquí
    blinda contra futuros cambios en el middleware o el manager.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = AdminPagination
    serializer_class = AdminTenantUserSerializer

    ALLOWED_ORDERING = {
        "last_login",
        "-last_login",
        "date_joined",
        "-date_joined",
        "email",
        "-email",
    }

    def get_queryset(self) -> QuerySet[User]:
        tenant_id = self.kwargs.get("pk")

        # Guard explícito: si el tenant no existe, 404.
        if not Tenant.objects.filter(pk=tenant_id).exists():
            from django.http import Http404

            raise Http404("Tenant not found")

        # Filtro explícito por tenant_id — NO confiamos en el auto-filter
        # del TenantAwareUserManager.
        qs = User.objects.filter(tenant_id=tenant_id)

        params = self.request.query_params

        role = params.get("role")
        if role in {"admin", "staff", "customer"}:
            qs = qs.filter(role=role)

        is_active = _parse_bool(params.get("is_active"))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )

        ordering = params.get("ordering")
        if ordering in self.ALLOWED_ORDERING:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("-date_joined")

        return qs


# ---------------------------------------------------------------------------
# User detail view — Phase 3 (Issue #110)
# ---------------------------------------------------------------------------


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH ``/api/admin/users/<int:pk>/``.

    Reglas clave:
    - Superadmins (``tenant IS NULL``) NO son accesibles vía este endpoint
      (para eso está ``/api/admin/superadmins/``). Se devuelve 404 para no
      filtrar la existencia del recurso.
    - El superadmin autenticado NO puede modificar su propio usuario aquí
      (self-protection). Responde 403.
    - ``PATCH`` sólo acepta ``is_active`` y ``role`` (allowlist). Cualquier
      otro campo se ignora silenciosamente.
    - Se crea entrada en ``AdminAuditLog`` en cada transición destructiva:
      ``deactivate_user`` / ``activate_user`` (cambio de ``is_active``) y
      ``change_user_role`` (cambio de ``role``). Cambios "no-op" (mismo
      valor) no disparan audit log.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    lookup_field = "pk"
    serializer_class = AdminUserDetailSerializer

    def get_queryset(self) -> QuerySet[User]:
        # Excluye explícitamente superadmins — para ellos hay otro endpoint.
        # ``select_related`` + ``prefetch_related`` evitan N+1 al serializar
        # tenant, social_accounts, passkeys y totp_device.
        return (
            User.objects.filter(tenant__isnull=False)
            .select_related("tenant", "totp_device")
            .prefetch_related("social_accounts", "webauthn_credentials")
        )

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()

        # Self-protection: un superadmin no debería poder tocar su propio
        # usuario aquí. Pero como excluimos superadmins del queryset, este
        # caso solo ocurre si el superadmin tiene un tenant (inconsistencia
        # de datos). Dejamos el guard explícito por defensa en profundidad.
        if user.pk == request.user.pk:
            return Response(
                {"detail": "Cannot modify your own user via this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        if not validated:
            return Response(
                AdminUserDetailSerializer(user).data,
                status=status.HTTP_200_OK,
            )

        previous_is_active = user.is_active
        previous_role = user.role
        update_fields: list[str] = []

        for field, value in validated.items():
            setattr(user, field, value)
            update_fields.append(field)

        if update_fields:
            user.save(update_fields=update_fields)

        # Audit trail: una entrada por tipo de cambio destructivo.
        ip = get_client_ip(request)
        target_repr = f"user: {user.email}"

        if "is_active" in validated and previous_is_active != validated["is_active"]:
            action = (
                AdminAuditLog.ACTION_ACTIVATE_USER if validated["is_active"] else AdminAuditLog.ACTION_DEACTIVATE_USER
            )
            self._write_audit(
                actor=request.user,
                action=action,
                target_id=str(user.pk),
                target_repr=target_repr,
                details={
                    "previous_is_active": previous_is_active,
                    "new_is_active": validated["is_active"],
                },
                ip_address=ip,
            )

        if "role" in validated and previous_role != validated["role"]:
            self._write_audit(
                actor=request.user,
                action=AdminAuditLog.ACTION_CHANGE_USER_ROLE,
                target_id=str(user.pk),
                target_repr=target_repr,
                details={
                    "old_role": previous_role,
                    "new_role": validated["role"],
                },
                ip_address=ip,
            )

        # Re-fetch con prefetch para evitar N+1 al serializar métodos auth.
        refreshed = self.get_queryset().get(pk=user.pk)
        return Response(
            AdminUserDetailSerializer(refreshed).data,
            status=status.HTTP_200_OK,
        )

    def put(self, request, *args, **kwargs):
        return Response(
            {"detail": 'Method "PUT" not allowed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @staticmethod
    def _write_audit(
        *,
        actor: User,
        action: str,
        target_id: str,
        target_repr: str,
        details: dict,
        ip_address: str | None,
    ) -> None:
        """Escribe una entrada de AdminAuditLog. No bloquea la acción si falla."""
        try:
            AdminAuditLog.objects.create(
                actor=actor,
                action=action,
                target_type="User",
                target_id=target_id,
                target_repr=target_repr,
                details=details,
                ip_address=ip_address,
            )
        except Exception:  # pragma: no cover — defensivo
            logger.exception(
                "Failed to write AdminAuditLog action=%s target_id=%s",
                action,
                target_id,
            )
