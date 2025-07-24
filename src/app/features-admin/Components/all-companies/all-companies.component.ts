import { Component } from '@angular/core';
import {AllCompanies, AllHotspots, ApiResponse} from "../../Model/adminTypes";
import {AdminEndpointService} from "../../Services/endpoint/admin-endpoint.service";
import {utils, WorkBook, WorkSheet, writeFile} from "xlsx";
import { saveAs } from 'file-saver';
@Component({
  selector: 'app-all-companies',
  templateUrl: './all-companies.component.html',
  styleUrls: ['./all-companies.component.scss']
})
export class AllCompaniesComponent {
  companies: AllCompanies[] = [];
  filteredCompanies: AllCompanies[] = [];
  loading: boolean = false;
  error: string | null = null;

  filters = {
    id: '',
    name: ''
  };

  // Paginación
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 0;

  constructor(private endpointService: AdminEndpointService) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading = true;
    this.endpointService.allCompanies().subscribe({
      next: (res: ApiResponse<AllCompanies[]>) => {
        if (res.isSucces) {
          this.companies = res.data;
          this.applyPagination();
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
    this.filteredCompanies = this.companies.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.companies.length / this.pageSize);
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
    this.filteredCompanies = this.companies.filter(hs => {
      return (
        (!this.filters.id || hs.id.toString().includes(this.filters.id)) &&
        (!this.filters.name || hs.name.toLowerCase().includes(this.filters.name.toLowerCase()))
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
      writeFile(wb, 'allcompanies.xlsx');

      console.log('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    }
  }
  private prepareExportData(): any[] {
    return this.filteredCompanies.map(company => ({
      ID: company.id,
      Name: company.name,
    }));
  }

  exportToCSV(): void {
    try {
      const data = this.prepareExportData();
      const replacer = (key: any, value: any) => value === null ? '' : value;
      const header = Object.keys(data[0]);
      let csv = data.map(row => header.map(fieldName =>
        JSON.stringify(row[fieldName], replacer)).join(','));
      csv.unshift(header.join(','));
      const csvArray = csv.join('\r\n');

      const blob = new Blob([csvArray], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'allcompanies.csv');

      console.log('CSV exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar a CSV:', error);
    }
  }
}
