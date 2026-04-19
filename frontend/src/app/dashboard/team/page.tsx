// src/app/dashboard/team/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  getTeamMembers,
  getTeamInvitations,
  createTeamInvitation,
  cancelTeamInvitation,
  resendTeamInvitation,
} from '@/lib/api/team';
import {
  ArrowLeft,
  UserPlus,
  Mail,
  RotateCw,
  X,
  Users,
  Clock,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { TeamMember, TeamInvitation, CreateInvitationData } from '@/types';

function statusBadge(status: TeamInvitation['status']) {
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendiente', variant: 'outline' },
    accepted: { label: 'Aceptada', variant: 'default' },
    cancelled: { label: 'Cancelada', variant: 'secondary' },
    expired: { label: 'Expirada', variant: 'destructive' },
  };
  const config = variants[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function roleBadge(role: 'admin' | 'staff') {
  if (role === 'admin') {
    return (
      <Badge variant="default" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Shield className="h-3 w-3" />
      Staff
    </Badge>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState<CreateInvitationData>({
    email: '',
    role: 'staff',
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Solo admins pueden ver esta página
  useEffect(() => {
    if (mounted && user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [mounted, user, router]);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: getTeamMembers,
    enabled: mounted && user?.role === 'admin',
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['team-invitations'],
    queryFn: getTeamInvitations,
    enabled: mounted && user?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateInvitationData) => createTeamInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      setInviteOpen(false);
      setInviteData({ email: '', role: 'staff' });
      toast({
        title: 'Invitación enviada',
        description: 'Se ha enviado un email de invitación',
      });
    },
    onError: (error: Error & { errors?: Record<string, string[]> }) => {
      const fieldError = error.errors?.email?.[0];
      toast({
        title: 'Error',
        description: fieldError || error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTeamInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast({ title: 'Invitación cancelada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendTeamInvitation,
    onSuccess: () => {
      toast({ title: 'Invitación reenviada', description: 'Se ha reenviado el email' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email.trim()) return;
    createMutation.mutate(inviteData);
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  const pendingInvitations = invitations?.filter((i) => i.status === 'pending') || [];
  const pastInvitations = invitations?.filter((i) => i.status !== 'pending') || [];

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al panel
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Equipo</h1>
            <p className="text-muted-foreground">
              Gestiona los miembros de tu equipo e invita nuevos colaboradores
            </p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invitar miembro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar miembro al equipo</DialogTitle>
                <DialogDescription>
                  Se enviará un email con un enlace para unirse a tu equipo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="miembro@ejemplo.com"
                      value={inviteData.email}
                      onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Rol</Label>
                    <Select
                      value={inviteData.role}
                      onValueChange={(value: 'staff' | 'admin') =>
                        setInviteData({ ...inviteData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Empleado</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {inviteData.role === 'admin'
                        ? 'Tendrá acceso completo a la gestión del negocio'
                        : 'Podrá gestionar citas y servicios asignados'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Enviando...' : 'Enviar invitación'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Team Members */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros ({members?.length || 0})
          </CardTitle>
          <CardDescription>Personas con acceso al panel de administración</CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <div className="divide-y">
              {members.map((member: TeamMember) => (
                <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {member.avatar ? (
                        <Image
                          src={member.avatar}
                          alt={member.full_name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {member.first_name?.[0] || member.email[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleBadge(member.role)}
                    {member.id === user?.id && (
                      <Badge variant="outline">Tú</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay miembros en el equipo</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {(pendingInvitations.length > 0 || invitationsLoading) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Invitaciones pendientes ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>Invitaciones enviadas que aún no han sido aceptadas</CardDescription>
          </CardHeader>
          <CardContent>
            {invitationsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
              </div>
            ) : (
              <div className="divide-y">
                {pendingInvitations.map((inv: TeamInvitation) => (
                  <div key={inv.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invitado por {inv.invited_by_name} &middot;{' '}
                          {new Date(inv.created_at).toLocaleDateString('es')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {roleBadge(inv.role)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendMutation.mutate(inv.id)}
                        disabled={resendMutation.isPending}
                        title="Reenviar"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Cancelar invitación">
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar invitación</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de cancelar la invitación a {inv.email}? El enlace de invitación dejará de funcionar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>No, mantener</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelMutation.mutate(inv.id)}
                            >
                              Sí, cancelar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past Invitations */}
      {pastInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Historial de invitaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pastInvitations.map((inv: TeamInvitation) => (
                <div key={inv.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString('es')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleBadge(inv.role)}
                    {statusBadge(inv.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
