import { Component } from '@angular/core';
import { ApiResponse, AllPanoramas } from "../../Model/adminTypes";
import { AdminEndpointService } from "../../Services/endpoint/admin-endpoint.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-all-panoramas',
  templateUrl: './all-panoramas.component.html',
  styleUrls: ['./all-panoramas.component.scss']
})
export class AllPanoramasComponent {
  panoramas: AllPanoramas[] = [];
  filteredPanoramas: AllPanoramas[] = [];
  loading: boolean = false;
  error: string | null = null;
  filters = {
    id: '',
    filename: '',
    address: '',
    latlng: '',
    viewerUrl: ''
  };
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 0;
  isModalVisible = false;
  constructor(
    private endpointService: AdminEndpointService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadPanoramas();
  }

  loadPanoramas(): void {
    this.loading = true;
    this.error = null;

    this.endpointService.allPanoramas().subscribe({
      next: (response: ApiResponse<AllPanoramas[]>) => {
        if (response.isSucces) {
          this.panoramas = response.data;
          this.setupPagination();
        } else {
          this.error = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Error al cargar panoramas';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  setupPagination(): void {
    this.totalPages = Math.ceil(this.panoramas.length / this.pageSize);
    this.currentPage = 1;
    this.updateFilteredPanoramas();
  }

  updateFilteredPanoramas(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredPanoramas = this.panoramas.slice(start, end);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateFilteredPanoramas();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateFilteredPanoramas();
    }
  }
  onOpenModal(): void {
    this.isModalVisible = true;
  }
  updatePage(page: number): void {
    if (page !== this.currentPage) {
      this.currentPage = page;
      this.updateFilteredPanoramas();
    }
  }
  applyFilters() {
    this.filteredPanoramas = this.panoramas.filter(p => {
      const latlng = `${p.latitude}, ${p.longitude}`;
      return (
        (!this.filters.id || p.id.toString().includes(this.filters.id)) &&
        (!this.filters.filename || p.filename.toLowerCase().includes(this.filters.filename.toLowerCase())) &&
        (!this.filters.address || p.address.toLowerCase().includes(this.filters.address.toLowerCase())) &&
        (!this.filters.latlng || latlng.includes(this.filters.latlng)) &&
        (!this.filters.viewerUrl || p.viewerUrl.toLowerCase().includes(this.filters.viewerUrl.toLowerCase()))
      );
    });
  }
  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
  }
  onCloseModal() {
    this.isModalVisible = false;
    console.log('eliminar modal desde componente padre', this.isModalVisible);
  }
  onUploaderImage() {
    this.router.navigate(['/admin/image-uploader']);
  }

}
