import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Cliente, Activacion } from '../../core/models';

interface ClienteConStats extends Cliente {
  sims: number;
  activadas: number;
}

@Component({
  selector: 'app-clientes',
  imports: [FormsModule, RouterLink],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class Clientes {
  private data = inject(DataService);

  readonly busqueda = signal('');

  // Usa datos cacheados del servicio (client-side join, zero extra reads)
  private readonly clientesBase = toSignal(this.data.clientes$(), { initialValue: [] as Cliente[] });
  private readonly activaciones = toSignal(this.data.activaciones$(), { initialValue: [] as Activacion[] });

  readonly clientes = computed<ClienteConStats[]>(() => {
    const clientes = this.clientesBase();
    const acts = this.activaciones();
    const mapa = new Map<string, { sims: number; activadas: number }>();
    for (const a of acts) {
      if (!a.clienteId) continue;
      const m = mapa.get(a.clienteId) ?? { sims: 0, activadas: 0 };
      m.sims++;
      if (a.estatus === 'activado') m.activadas++;
      mapa.set(a.clienteId, m);
    }
    return clientes.map(c => ({
      ...c,
      sims: mapa.get(c.id)?.sims ?? 0,
      activadas: mapa.get(c.id)?.activadas ?? 0,
    }));
  });

  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return this.clientes();
    return this.clientes().filter((c) =>
      `${c.nombre} ${c.colonia ?? ''} ${c.domicilio ?? ''} ${c.telefono ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  });
}