# backend/core/forms.py

from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.utils.translation import gettext_lazy as _


class TenantAuthenticationForm(AuthenticationForm):
    """
    Formulario de autenticación para Django Admin de NERBIS.

    Este admin es exclusivamente para superusuarios de plataforma (sin tenant).
    Los admins de tenant gestionan su negocio desde el dashboard del frontend,
    no desde aquí.
    """

    # Username = email (los users del sistema usan email como identificador)
    username = forms.EmailField(
        label=_("Correo electrónico"),
        max_length=254,
        widget=forms.EmailInput(
            attrs={
                "autofocus": True,
                "autocomplete": "email",
                "placeholder": "tu@email.com",
            }
        ),
    )

    password = forms.CharField(
        label=_("Contraseña"),
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                "autocomplete": "current-password",
                "placeholder": "••••••••",
            }
        ),
    )

    field_order = ["username", "password"]

    error_messages = {
        "invalid_login": _("Credenciales inválidas."),
        "inactive": _("Esta cuenta está inactiva."),
        "not_superuser": _("Este panel es exclusivo para superusuarios de NERBIS."),
    }

    def clean(self):
        email = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if email and password:
            from core.models import User

            # Solo superusuarios sin tenant pueden acceder al admin de Django
            try:
                user = User.objects.get(tenant__isnull=True, email=email)
            except User.DoesNotExist:
                raise forms.ValidationError(
                    self.error_messages["invalid_login"],
                    code="invalid_login",
                )

            if not user.is_superuser:
                raise forms.ValidationError(
                    self.error_messages["not_superuser"],
                    code="not_superuser",
                )

            if not user.check_password(password):
                raise forms.ValidationError(
                    self.error_messages["invalid_login"],
                    code="invalid_login",
                )

            if not user.is_active:
                raise forms.ValidationError(
                    self.error_messages["inactive"],
                    code="inactive",
                )

            self.user_cache = user

        return self.cleaned_data

    def get_user(self):
        return getattr(self, "user_cache", None)

    def confirm_login_allowed(self, user):
        if not user.is_active:
            raise forms.ValidationError(
                self.error_messages["inactive"],
                code="inactive",
            )
        if not user.is_superuser:
            raise forms.ValidationError(
                self.error_messages["not_superuser"],
                code="not_superuser",
            )
