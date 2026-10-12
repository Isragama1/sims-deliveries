import { Routes } from '@angular/router';
import { AuthGuard, redirectLoggedInTo, redirectUnauthorizedTo } from '@angular/fire/auth-guard';

const aLogin = () => redirectUnauthorizedTo(['login']);
const aHome = () => redirectLoggedInTo(['home']);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aHome },
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'stock',
    loadComponent: () => import('./pages/stock/stock').then((m) => m.Stock),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'clientes',
    loadComponent: () => import('./pages/clientes/clientes').then((m) => m.Clientes),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'clientes/nuevo',
    loadComponent: () => import('./pages/clientes/cliente-form').then((m) => m.ClienteForm),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'clientes/:id/editar',
    loadComponent: () => import('./pages/clientes/cliente-form').then((m) => m.ClienteForm),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'clientes/:id',
    loadComponent: () =>
      import('./pages/clientes/cliente-detalle').then((m) => m.ClienteDetalle),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'ruta',
    loadComponent: () => import('./pages/ruta/ruta').then((m) => m.Ruta),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'venta',
    loadComponent: () => import('./pages/venta/venta').then((m) => m.VentaPage),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'activaciones/:iccid/editar',
    loadComponent: () => import('./pages/activaciones/activacion-form').then((m) => m.ActivacionForm),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./pages/estadisticas/estadisticas').then((m) => m.Estadisticas),
    canActivate: [AuthGuard],
    data: { authGuardPipe: aLogin },
  },
  { path: '**', redirectTo: 'home' },
];
