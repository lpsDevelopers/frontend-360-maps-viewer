import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../Services/viewer-360/api/api.service';
import { Hotspot } from '../../../Model/types';

interface PosteResponse {
  isSucces: boolean;
  message: string;
  data: Hotspot;
  errors: any;
}

@Component({
  selector: 'app-get-hotspot',
  templateUrl: './get-hotspot.component.html',
  styleUrls: ['./get-hotspot.component.scss'],
  animations: [
    trigger('slideIn', [
      state('in', style({ transform: 'translateX(0)' })),
      transition('void => *', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('* => void', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class GetHotspotComponent implements OnInit, OnDestroy {
  @Input() hotspotId: number | null = null;

  visible = false;
  loading = false;
  posteResponse: PosteResponse | null = null;

  private subscription: Subscription = new Subscription();

  constructor(
    private apiService: ApiService
  ) {
    console.log('🏗️ GetHotspotComponent → Constructor inicializado');
  }

  ngOnInit(): void {
    console.log('🚀 GetHotspotComponent → Inicializando...');
    if (this.hotspotId) {
      this.loadHotspotData(this.hotspotId);
    }
  }

  ngOnDestroy(): void {
    console.log('🧹 GetHotspotComponent → Limpiando recursos...');
    this.subscription?.unsubscribe();
  }


  showHotspot(hotspotId: number): void {
    console.log('📂 Mostrando hotspot con ID:', hotspotId);
    this.hotspotId = hotspotId;
    this.visible = true;
    this.loadHotspotData(hotspotId);
  }

  closePanel(): void {
    console.log('🚪 Cerrando panel de visualización...');
    this.visible = false;
    this.posteResponse = null;
    this.hotspotId = null;
  }

  refreshData(): void {
    if (this.hotspotId) {
      console.log('🔄 Refrescando datos del hotspot:', this.hotspotId);
      this.loadHotspotData(this.hotspotId);
    }
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  private loadHotspotData(id: number): void {
    console.log('📥 Cargando datos del hotspot:', id);
    this.loading = true;

    this.subscription.add(
      this.apiService.getPosteById(id).subscribe({
        next: (response: any) => {
          console.log('✅ Datos del hotspot cargados:', response);
          this.posteResponse = {
            isSucces: true,
            message: 'Consulta Exitosa',
            data: response.data || response,
            errors: null
          };
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error cargando datos del hotspot:', error);
          this.posteResponse = {
            isSucces: false,
            message: 'Error al cargar los datos',
            data: {} as Hotspot,
            errors: error
          };
          this.loading = false;
        }
      })
    );
  }

  // ============================================
  // MÉTODOS DE UTILIDAD PARA EL TEMPLATE
  // ============================================

  getCriticidadClass(criticidad: string): string {
    switch (criticidad?.toLowerCase()) {
      case 'alta': return 'criticidad-alta';
      case 'media': return 'criticidad-media';
      case 'baja': return 'criticidad-baja';
      default: return 'criticidad-default';
    }
  }

  getCondicionClass(condicion: string): string {
    switch (condicion?.toLowerCase()) {
      case 'activo': return 'condicion-activo';
      case 'inactivo': return 'condicion-inactivo';
      default: return 'condicion-default';
    }
  }

  getTipoPosteClass(tipoPoste: string): string {
    switch (tipoPoste?.toLowerCase()) {
      case 'hostpot': return 'tipo-hostpot';
      case 'equipamiento': return 'tipo-equipamiento';
      case 'saturado': return 'tipo-saturado';
      case 'inclinado': return 'tipo-inclinado';
      default: return 'tipo-default';
    }
  }

  getTipoPosteIcon(tipoPoste: string): string {
    switch (tipoPoste?.toLowerCase()) {
      case 'hostpot': return '🟡';
      case 'equipamiento': return '🟢';
      case 'saturado': return '🔴';
      case 'inclinado': return '⚫';
      default: return '📍';
    }
  }

  hasObservaciones(): boolean {
    if (!this.posteResponse?.data) return false;
    const data = this.posteResponse.data;
    return !!(data.observacion1 || data.observacion2 || data.observacion3);
  }

  hasArchivos(): boolean {
    if (!this.posteResponse?.data) return false;
    const data = this.posteResponse.data;
    return !!(data.filePath1 || data.filePath2 || data.filePath3);
  }

  viewFile(filePath: string): void {
    if (filePath && filePath.startsWith('http')) {
      console.log('👁️ Abriendo archivo:', filePath);
      window.open(filePath, '_blank');
    }
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('📋 Texto copiado al portapapeles:', text);
        this.showSuccess('Texto copiado al portapapeles');
      }).catch(error => {
        console.error('❌ Error al copiar:', error);
        this.copyTextFallback(text);
      });
    } else {
      this.copyTextFallback(text);
    }
  }

  private copyTextFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.showSuccess('Texto copiado al portapapeles');
    } catch (err) {
      console.error('❌ Error en fallback copy:', err);
      this.showError('No se pudo copiar el texto');
    }
    document.body.removeChild(textArea);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private showSuccess(message: string): void {
    console.log('✅ Éxito:', message);
    // Implementar notificación de éxito
  }

  private showError(message: string): void {
    console.error('❌ Error:', message);
    // Implementar notificación de error
  }
}
