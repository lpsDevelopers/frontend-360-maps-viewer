import { Component } from '@angular/core';
import {AllHotspots, ApiResponse} from "../../Model/adminTypes";
import {AdminEndpointService} from "../../Services/endpoint/admin-endpoint.service";
import {utils, WorkBook, WorkSheet, writeFile} from "xlsx";
import {saveAs} from "file-saver";

@Component({
  selector: 'app-all-hotspots',
  templateUrl: './all-hotspots.component.html',
  styleUrls: ['./all-hotspots.component.scss']
})
export class AllHotspotsComponent {
  isMobile: boolean = false;
  isMobileOpen: boolean = false;
  isModalVisible = false;
  hotspots: AllHotspots[] = [];
  filteredHotspots: AllHotspots[] = [];
  loading: boolean = false;
  error: string | null = null;
  editingRowIndex: number = -1;
  originalRowData: any = null;
  filters = {
    id: '',
    item: '',
    codigoPosteAntiguo: '',
    pitch: '',
    yaw: '',
    theta: '',
    phi: '',
    tipoPoste: '',
    criticidad: '',
    red: '',
    tipoRed: '',
    alturaSoporte: '',
    alturaVano: '',
    codigoDistrito: '',
    tipoVia: '',
    nombreVia: '',
    numero: '',
    manzana: '',
    lote: '',
    coordenadas: '',
    latitudS: '',
    longitudW: '',
    urbanizacion: '',
    posteSiguiente: '',
    observacion1: '',
    observacion2: '',
    observacion3: '',
    condicion: '',
    trabajoARealizar: '',
    panoramasId: '',
    viewCapturePath: '',
    filePath1: '',
    filePath2: '',
    filePath3: ''
  };

  // Paginación
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 0;

  constructor(private endpointService: AdminEndpointService) {}

  ngOnInit(): void {
    this.loadHotspots();
  }
  onOpenModal(): void {
    this.isModalVisible = true;
  }
  onCloseModal() {
    this.isModalVisible = false;
    console.log('eliminar modal desde componente padre', this.isModalVisible);
  }
  loadHotspots(): void {
    this.loading = true;
    this.endpointService.allHotspots().subscribe({
      next: (res: ApiResponse<AllHotspots[]>) => {
        if (res.isSucces) {
          this.hotspots = res.data;
          this.applyPagination();
          this.applyFilters();
        } else {
          this.error = res.message;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Error al cargar hotspots';
        this.loading = false;
      }
    });
  }

  applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredHotspots = this.hotspots.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.hotspots.length / this.pageSize);
  }

  updatePage(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  applyFilters() {
    this.filteredHotspots = this.hotspots.filter(hs => {
      return (
        (!this.filters.id || hs.id.toString().includes(this.filters.id)) &&
        (!this.filters.item || hs.item.toString().includes(this.filters.item)) &&
        (!this.filters.codigoPosteAntiguo || hs.codigoPosteAntiguo.includes(this.filters.codigoPosteAntiguo)) &&

        (!this.filters.urbanizacion || hs.urbanizacion.includes(this.filters.urbanizacion))

      );
    });
  }


  exportToExcel(): void {
    try {
      const data = this.prepareExportData();

      const wb: WorkBook = utils.book_new();
      const ws: WorkSheet = utils.json_to_sheet(data);

      // Ajustar anchos de columna
      const colWidths = [
        { wch: 10 },  // ID
        { wch: 15 },  // Usuario
        { wch: 15 },  // Monto
        { wch: 20 },  // Estado
        { wch: 20 },  // Fecha
      ];
      ws['!cols'] = colWidths;

      utils.book_append_sheet(wb, ws, 'Depósitos');
      writeFile(wb, 'postes.xlsx');

      console.log('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    }
  }
  private prepareExportData(): any[] {
    return this.filteredHotspots.map(hs => ({ ...hs }));
  }



  exportToCSV(): void {
    try {
      const data = this.prepareExportData();

      if (!data || data.length === 0) {
        console.warn('No hay datos para exportar');
        return;
      }

      // Función para reemplazar valores nulos por cadena vacía
      const replacer = (key: any, value: any) => (value === null || value === undefined ? '' : value);

      // Obtiene los encabezados (keys) del primer objeto
      const header = Object.keys(data[0]);

      // Convierte cada objeto a una fila CSV, serializando cada campo
      let csv = data.map(row =>
        header.map(fieldName =>
          JSON.stringify(row[fieldName], replacer)
        ).join(',')
      );

      // Inserta los encabezados al inicio
      csv.unshift(header.join(','));

      // Une todo en un string con saltos de línea para CSV
      const csvArray = csv.join('\r\n');

      // Crea un blob y descarga el archivo
      const blob = new Blob([csvArray], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'postes.csv');

      console.log('CSV exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar a CSV:', error);
    }
  }
  startEditing(index: number): void {
    this.originalRowData = { ...this.filteredHotspots[index] };
    this.editingRowIndex = index;
  }

  // Guardar cambios
  saveChanges(index: number, poste: any): void {
    // Preparar el payload con la estructura correcta
    const updatePayload = {
      id: poste.id,
      item: poste.item || '',
      codigoPosteAntiguo: poste.codigoPosteAntiguo || '',
      pitch: Number(poste.pitch) || 0,
      yaw: Number(poste.yaw) || 0,
      theta: Number(poste.theta) || 0,
      phi: Number(poste.phi) || 0,
      tipoPoste: poste.tipoPoste || '',
      criticidad: poste.criticidad || '',
      red: poste.red || '',
      tipoRed: poste.tipoRed || '',
      alturaSoporte: Number(poste.alturaSoporte) || 0,
      alturaVano: Number(poste.alturaVano) || 0,
      codigoDistrito: poste.codigoDistrito || '',
      tipoVia: poste.tipoVia || '',
      nombreVia: poste.nombreVia || '',
      numero: poste.numero || '',
      manzana: poste.manzana || '',
      lote: poste.lote || '',
      coordenadas: poste.coordenadas || '',
      latitudS: poste.latitudS || '',
      longitudW: poste.longitudW || '',
      urbanizacion: poste.urbanizacion || '',
      posteSiguiente: poste.posteSiguiente || '',
      observacion1: poste.observacion1 || '',
      observacion2: poste.observacion2 || '',
      observacion3: poste.observacion3 || '',
      condicion: poste.condicion || '',
      trabajoARealizar: poste.trabajoARealizar || '',
      panoramasId: Number(poste.panoramasId) || 1,
      viewCapturePath: Number(poste.viewCapturePath) || 0,
      filePath1: poste.filePath1 || '',
      filePath2: poste.filePath2 || '',
      filePath3: poste.filePath3 || '',
      locationId: Number(poste.locationId) || 1
    };

    console.log('Enviando actualización:', updatePayload);

    // Llamar al servicio para actualizar en el backend
    this.endpointService.updatePoste(updatePayload).subscribe({
      next: (response) => {
        console.log('Poste actualizado exitosamente:', response);
        this.editingRowIndex = -1;
        this.originalRowData = null;

        // Actualizar los datos locales con la respuesta del servidor
        if (response) {
          this.filteredHotspots[index] = { ...response };
        }
      },
      error: (err) => {
        console.error('Error al actualizar poste:', err);

        // Mostrar errores específicos de validación
        if (err.error && err.error.errors) {
          console.error('Errores de validación:', err.error.errors);
        }

        // Revertir cambios en caso de error
        this.filteredHotspots[index] = { ...this.originalRowData };
        this.editingRowIndex = -1;
        this.originalRowData = null;

        // Mostrar mensaje de error al usuario
        alert('Error al actualizar el registro. Revisa los datos e intenta nuevamente.');
      }
    });
  }
  // Cancelar edición
  cancelEditing(index: number): void {
    if (this.originalRowData) {
      this.filteredHotspots[index] = { ...this.originalRowData };
    }
    this.editingRowIndex = -1;
    this.originalRowData = null;
  }


}
