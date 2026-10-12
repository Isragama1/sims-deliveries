import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { DataService } from '../../core/data.service';
import { Activacion, Entrega } from '../../core/models';

@Component({
  selector: 'app-cliente-detalle',
  imports: [DatePipe, RouterLink],
  templateUrl: './cliente-detalle.html',
  styleUrl: './cliente-detalle.scss',
})
export class ClienteDetalle {
  private data = inject(DataService);

  /** Viene de la ruta /clientes/:id (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly cliente = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.data.cliente$(id))),
  );

  readonly sims = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.data.activacionesPorCliente$(id))),
    { initialValue: [] as Activacion[] },
  );

  readonly entregas = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.data.entregasPorCliente$(id))),
    { initialValue: [] as Entrega[] },
  );
}
