import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Activacion } from '../../core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-activacion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activacion-form.html',
  styleUrl: './activacion-form.scss',
})
export class ActivacionForm {
  private fb = inject(FormBuilder);
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form: FormGroup;
  cargando = true;
  guardando = false;
  error = '';
  iccid = '';

  constructor() {
    this.form = this.fb.group({
      sub: [''],
      lada: [''],
      dn: [''],
      marca: ['ATT'],
      recargaMonto: [null],
      tipo: [''],
      clienteNombre: [''],
      clienteId: [''],
      estatus: ['en_stock'],
      idOrden: [''],
      noContrato: [''],
      statusOrden: [''],
      cuentaCliente: [''],
      mdnInicial: [''],
      mdnActual: [''],
      mdnDefinitivo: [''],
      empresa: [''],
      planTarifario: [''],
    });

    this.route.paramMap.subscribe((params) => {
      this.iccid = params.get('iccid') ?? '';
      if (this.iccid) this.cargar();
    });
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      const snap = await this.data.activaciones$().subscribe({
        next: (lista) => {
          const act = lista.find((a) => a.iccid === this.iccid);
          if (act) {
            this.patchForm(act);
          } else {
            this.error = 'Activación no encontrada';
          }
          this.cargando = false;
        },
        error: () => {
          this.error = 'Error al cargar';
          this.cargando = false;
        },
      });
      snap.unsubscribe();
    } catch {
      this.error = 'Error al cargar';
      this.cargando = false;
    }
  }

  private patchForm(a: Activacion): void {
    const activacion = a.activacion ?? {} as NonNullable<Activacion['activacion']>;
    this.form.patchValue({
      sub: a.sub ?? '',
      lada: a.lada ?? '',
      dn: a.dn ?? '',
      marca: a.marca ?? 'ATT',
      recargaMonto: a.recargaMonto ?? null,
      tipo: a.tipo ?? '',
      clienteNombre: a.clienteNombre ?? '',
      clienteId: a.clienteId ?? '',
      estatus: a.estatus ?? 'en_stock',
      idOrden: activacion.idOrden ?? '',
      noContrato: activacion.noContrato ?? '',
      statusOrden: activacion.statusOrden ?? '',
      cuentaCliente: activacion.cuentaCliente ?? '',
      mdnInicial: activacion.mdnInicial ?? '',
      mdnActual: activacion.mdnActual ?? '',
      mdnDefinitivo: activacion.mdnDefinitivo ?? '',
      empresa: activacion.empresa ?? '',
      planTarifario: activacion.planTarifario ?? '',
    });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || !this.iccid) return;
    this.guardando = true;
    this.error = '';

    const v = this.form.value;
    const datos: Partial<Activacion> = {
      sub: v.sub || null,
      lada: v.lada || null,
      dn: v.dn || null,
      marca: v.marca || null,
      recargaMonto: v.recargaMonto ?? null,
      tipo: v.tipo || null,
      clienteNombre: v.clienteNombre || null,
      clienteId: v.clienteId || null,
      estatus: v.estatus,
      activacion: {
        idOrden: v.idOrden || null,
        noContrato: v.noContrato || null,
        statusOrden: v.statusOrden || null,
        fechaContratacion: null,
        fechaActivacion: null,
        cuentaCliente: v.cuentaCliente || null,
        mdnInicial: v.mdnInicial || null,
        mdnActual: v.mdnActual || null,
        mdnDefinitivo: v.mdnDefinitivo || null,
        empresa: v.empresa || null,
        planTarifario: v.planTarifario || null,
      },
    };

    try {
      await this.data.actualizarActivacion(this.iccid, datos);
      await this.router.navigate(['/stock']);
    } catch {
      this.error = 'Error al guardar';
    } finally {
      this.guardando = false;
    }
  }

  volver(): void {
    this.router.navigate(['/stock']);
  }
}