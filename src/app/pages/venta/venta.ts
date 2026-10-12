import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
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

  // Carga lazy: activaciones y clientes al iniciar
  readonly sims = toSignal(this.data.activaciones$(), { initialValue: [] as Activacion[] });
  readonly clientes = toSignal(this.data.clientes$(), { initialValue: [] as Cliente[] });
  readonly ventas = toSignal(this.data.ventas$(), { initialValue: [] as Venta[] });

  private usuario = toSignal(this.auth.user$);

  // formulario
  readonly busquedaSim = signal('');
  readonly simsSeleccionadas = signal<Activacion[]>([]);
  readonly clienteId = signal('');
  readonly notas = signal('');

  readonly guardando = signal(false);
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  readonly sugerencias = computed(() => {
    const q = this.busquedaSim().trim().toLowerCase();
    if (q.length < 3) return [];
    const elegidos = new Set(this.simsSeleccionadas().map((s) => s.iccid));
    return this.sims()
      .filter((a) => !elegidos.has(a.iccid))
      .filter((a) => `${a.iccid} ${a.dn ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  });

  readonly valido = computed(() => this.simsSeleccionadas().length > 0 && !!this.clienteId());

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
    if (!this.valido() || this.guardando()) return;
    const sims = this.simsSeleccionadas();
    const cliente = this.clientes().find((c) => c.id === this.clienteId()) ?? null;
    this.guardando.set(true);
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
        { marcarActivada: false },
      );
      this.mensaje.set({
        tipo: 'ok',
        texto:
          `Entrega registrada con ${sims.length} SIM${sims.length > 1 ? 's' : ''}` +
          (ubicacion ? ' y ubicación.' : '. (Sin ubicación: permiso denegado o no disponible.)'),
      });
      this.limpiarSims();
      this.notas.set('');
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'No se pudo registrar. Intenta de nuevo.' });
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
}