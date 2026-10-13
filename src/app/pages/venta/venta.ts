import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { GeoService } from '../../core/geo.service';
import { Activacion, Cliente, Venta } from '../../core/models';

@Component({
  selector: 'app-venta',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './venta.html',
  styleUrl: './venta.scss',
})
export class VentaPage {
  private data = inject(DataService);
  private auth = inject(AuthService);
  private geo = inject(GeoService);
  private readonly destroyRef = inject(DestroyRef);
  private mensajeTimer: ReturnType<typeof setTimeout> | null = null;
  private mensajeHistorialTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancelarTimerMensaje();
      this.cancelarTimerMensajeHistorial();
    });
  }

  // Carga lazy: activaciones y clientes al iniciar
  readonly sims = toSignal(this.data.activaciones$(), { initialValue: [] as Activacion[] });
  readonly clientes = toSignal(this.data.clientes$(), { initialValue: [] as Cliente[] });
  readonly ventas = toSignal(this.data.ventas$(), { initialValue: [] as Venta[] });

  private usuario = toSignal(this.auth.user$);

  // formulario
  readonly busquedaSim = signal('');
  readonly simsSeleccionadas = signal<Activacion[]>([]);
  readonly clienteId = signal('');
  readonly fechaEntrega = signal(this.formatearFechaLocal(new Date()));
  readonly notas = signal('');

  readonly guardando = signal(false);
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  readonly eliminandoVenta = signal<string | null>(null);
  readonly mensajeHistorial = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  readonly sugerencias = computed(() => {
    const q = this.busquedaSim().trim().toLowerCase();
    if (q.length < 3) return [];
    const elegidos = new Set(this.simsSeleccionadas().map((s) => s.iccid));
    return this.sims()
      .filter((a) => !elegidos.has(a.iccid))
      .filter((a) => `${a.iccid} ${a.dn ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  });

  readonly valido = computed(
    () =>
      this.simsSeleccionadas().length > 0 &&
      !!this.clienteId() &&
      this.convertirFechaLocal(this.fechaEntrega()) !== null,
  );

  elegirSim(a: Activacion): void {
    this.simsSeleccionadas.update((arr) => [...arr, a]);
    this.busquedaSim.set('');
    if (!this.clienteId() && a.clienteId) this.clienteId.set(a.clienteId);
  }

  quitarSim(iccid: string): void {
    this.simsSeleccionadas.update((arr) => arr.filter((s) => s.iccid !== iccid));
  }

  limpiarSims(): void {
    this.simsSeleccionadas.set([]);
    this.busquedaSim.set('');
  }

  async guardar(): Promise<void> {
    const fechaEntrega = this.convertirFechaLocal(this.fechaEntrega());
    if (!this.valido() || !fechaEntrega || this.guardando()) return;
    const sims = this.simsSeleccionadas();
    const cliente = this.clientes().find((c) => c.id === this.clienteId()) ?? null;
    this.guardando.set(true);
    this.cancelarTimerMensaje();
    this.mensaje.set(null);
    const ubicacion = await this.geo.obtenerUbicacion();
    try {
      await this.data.registrarVenta(
        {
          iccids: sims.map((s) => s.iccid),
          clienteId: cliente?.id ?? null,
          clienteNombre: cliente?.nombre ?? null,
          concepto: 'entrega',
          notas: this.notas().trim() || null,
          vendedor: this.usuario()?.email ?? null,
          ubicacion,
        },
        { marcarActivada: false, fechaEntrega },
      );
      this.mostrarMensaje({
        tipo: 'ok',
        texto:
          `Entrega registrada con ${sims.length} SIM${sims.length > 1 ? 's' : ''}` +
          (ubicacion ? ' y ubicación.' : '. (Sin ubicación: permiso denegado o no disponible.)'),
      });
      this.limpiarSims();
      this.fechaEntrega.set(this.formatearFechaLocal(new Date()));
      this.notas.set('');
    } catch {
      this.mostrarMensaje({ tipo: 'error', texto: 'No se pudo registrar. Intenta de nuevo.' });
    } finally {
      this.guardando.set(false);
    }
  }

  mapsUrl(u: NonNullable<Venta['ubicacion']>): string {
    return `https://www.google.com/maps/search/?api=1&query=${u.lat},${u.lng}`;
  }

  iccidsDe(v: { iccids?: string[]; iccid?: string }): string[] {
    return v.iccids ?? (v.iccid ? [v.iccid] : []);
  }

  async eliminarEntrega(venta: Venta): Promise<void> {
    if (venta.concepto !== 'entrega' || !venta.id || this.eliminandoVenta()) return;
    const totalSims = this.iccidsDe(venta).length;
    const confirmacion = window.confirm(
      `¿Eliminar esta entrega de ${totalSims} SIM${totalSims === 1 ? '' : 's'}? Se borrará del historial y las SIMs volverán al stock sin cliente.`,
    );
    if (!confirmacion) return;

    this.eliminandoVenta.set(venta.id);
    this.cancelarTimerMensajeHistorial();
    this.mensajeHistorial.set(null);
    try {
      await this.data.eliminarEntrega(venta);
      this.mostrarMensajeHistorial({
        tipo: 'ok',
        texto: 'Entrega eliminada y SIMs devueltas al stock.',
      });
    } catch (error) {
      console.error('No se pudo eliminar la entrega.', error);
      this.mostrarMensajeHistorial({
        tipo: 'error',
        texto: 'No se pudo eliminar la entrega. Verifica tu conexión e intenta de nuevo.',
      });
    } finally {
      this.eliminandoVenta.set(null);
    }
  }

  private mostrarMensaje(mensaje: { tipo: 'ok' | 'error'; texto: string }): void {
    this.cancelarTimerMensaje();
    this.mensaje.set(mensaje);
    this.mensajeTimer = setTimeout(() => {
      this.mensaje.set(null);
      this.mensajeTimer = null;
    }, 10_000);
  }

  private cancelarTimerMensaje(): void {
    if (this.mensajeTimer !== null) clearTimeout(this.mensajeTimer);
    this.mensajeTimer = null;
  }

  private mostrarMensajeHistorial(mensaje: { tipo: 'ok' | 'error'; texto: string }): void {
    this.cancelarTimerMensajeHistorial();
    this.mensajeHistorial.set(mensaje);
    this.mensajeHistorialTimer = setTimeout(() => {
      this.mensajeHistorial.set(null);
      this.mensajeHistorialTimer = null;
    }, 10_000);
  }

  private cancelarTimerMensajeHistorial(): void {
    if (this.mensajeHistorialTimer !== null) clearTimeout(this.mensajeHistorialTimer);
    this.mensajeHistorialTimer = null;
  }

  private formatearFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private convertirFechaLocal(valor: string): Date | null {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!coincidencia) return null;
    const [, anio, mes, dia] = coincidencia;
    const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
    if (
      fecha.getFullYear() !== Number(anio) ||
      fecha.getMonth() !== Number(mes) - 1 ||
      fecha.getDate() !== Number(dia)
    ) {
      return null;
    }
    return fecha;
  }
}