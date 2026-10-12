import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { DataService } from '../../core/data.service';
import { Cliente } from '../../core/models';

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

  private clientesConStats$ = combineLatest([
    this.data.clientes$(),
    this.data.activaciones$(),
  ]).pipe(
    map(([clientes, acts]) =>
      clientes.map((c) => ({
        ...c,
        sims: acts.filter((a) => a.clienteId === c.id).length,
        activadas: acts.filter((a) => a.clienteId === c.id && a.estatus === 'activado').length,
      })),
    ),
  );

  readonly clientes = toSignal(this.clientesConStats$, { initialValue: [] as ClienteConStats[] });

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
