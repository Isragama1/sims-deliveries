import { Timestamp } from '@angular/fire/firestore';

export interface Activacion {
  iccid: string;
  sub: string | null;
  lada: string | null;
  dn: string | null;
  marca: 'ATT' | 'UNEFON' | string | null;
  recargaMonto: number | null;
  fechaPreact: Timestamp | null;
  fechaVencimiento: Timestamp | null;
  tipo: string | null;
  clienteNombre: string | null;
  clienteId: string | null;
  estatus: 'activado' | 'en_stock';
  fechaActivacionBase: Timestamp | null;
  activacion: {
    idOrden: string | null;
    noContrato: string | null;
    statusOrden: string | null;
    fechaContratacion: Timestamp | null;
    fechaActivacion: Timestamp | null;
    cuentaCliente: string | null;
    mdnInicial: string | null;
    mdnActual: string | null;
    mdnDefinitivo: string | null;
    empresa: string | null;
    planTarifario: string | null;
  } | null;
}

export interface Cliente {
  id: string;
  nombre: string;
  colonia: string | null;
  domicilio: string | null;
  telefono: string | null;
  tipo?: string;
  ultimaVisita?: Timestamp | null;
}

export interface Venta {
  id?: string;
  /** SIMs incluidas en la venta (ventas antiguas pueden traer solo `iccid`). */
  iccids?: string[];
  iccid?: string;
  clienteId: string | null;
  clienteNombre: string | null;
  /** Ventas antiguas pueden traer monto/concepto; las entregas nuevas no. */
  monto?: number;
  concepto: 'entrega' | 'activacion' | 'recarga';
  notas: string | null;
  vendedor: string | null;
  fecha: Timestamp | null;
  /** Ubicación donde se registró la entrega (null si el usuario negó el permiso). */
  ubicacion?: { lat: number; lng: number; precision: number } | null;
}

export interface Entrega {
  iccid: string;
  clienteNombre: string | null;
  clienteId: string | null;
  fechaEntrega: Timestamp | null;
}
