import { Component } from '@angular/core';
import {AllHotspots, AllLocations, ApiResponse} from "../../Model/adminTypes";
import {AdminEndpointService} from "../../Services/endpoint/admin-endpoint.service";

@Component({
  selector: 'app-all-locations',
  templateUrl: './all-locations.component.html',
  styleUrls: ['./all-locations.component.scss']
})
export class AllLocationsComponent {
  locations: AllLocations[] = [];
  filteredLocations: AllLocations[] = [];
  loading: boolean = false;
  isModalVisible = false;
  error: string | null = null;
  filters = {
    id: '',
    companyId: '',
    name: '',
    description: '',
    latitude: '',
    longitude: ''
  };
  // Paginación
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 0;

  constructor(private endpointService: AdminEndpointService) {}

  ngOnInit(): void {
    this.loadLocations();
  }

  onOpenModal(): void {
    this.isModalVisible = true;
  }
  onCloseModal() {
    this.isModalVisible = false;
    console.log('eliminar modal desde componente padre', this.isModalVisible);
  }
  loadLocations(): void {
    this.loading = true;
    this.endpointService.allLocations().subscribe({
      next: (res: ApiResponse<AllLocations[]>) => {
        if (res.isSucces) {
          this.locations = res.data;
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
    this.filteredLocations = this.locations.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.locations.length / this.pageSize);
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
    this.filteredLocations = this.locations.filter(hs => {
      return (
        (!this.filters.id || hs.id.toString().includes(this.filters.id)) &&
        (!this.filters.companyId || hs.companyId.toString().includes(this.filters.companyId)) &&
        (!this.filters.name || hs.name.toLowerCase().includes(this.filters.name.toLowerCase())) &&
        (!this.filters.latitude || hs.latitude.toString().includes(this.filters.latitude)) &&
        (!this.filters.longitude || hs.longitude.toString().includes(this.filters.longitude))
      );
    });
  }

}
