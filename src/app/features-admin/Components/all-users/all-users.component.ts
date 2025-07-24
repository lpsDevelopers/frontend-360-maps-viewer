import { Component } from '@angular/core';
import {AllUsers, ApiResponse} from "../../Model/adminTypes";
import {AdminEndpointService} from "../../Services/endpoint/admin-endpoint.service";

@Component({
  selector: 'app-all-users',
  templateUrl: './all-users.component.html',
  styleUrls: ['./all-users.component.scss']
})
export class AllUsersComponent {

  filters = {
    id: '',
    email: '',
    stateList: '',
    emailVerified: ''
  };

  users: AllUsers[] = [];
  filteredUsers: AllUsers[] = [];
  loading: boolean = false;
  error: string | null = null;
  showFilterModal: boolean = false;
  selectedUserId: number | null = null;

  // Paginación
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 0;

  constructor(private endpointService: AdminEndpointService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;

    this.endpointService.allUsers().subscribe({
      next: (response: ApiResponse<AllUsers[]>) => {
        if (response.isSucces) {  // fijarse que coincida exacto con la API
          this.users = response.data;
          this.setupPagination();
        } else {
          this.error = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Error al cargar usuarios';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  setupPagination(): void {
    this.totalPages = Math.ceil(this.users.length / this.pageSize);
    this.currentPage = 1;
    this.updateFilteredUsers();
  }

  updateFilteredUsers(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredUsers = this.users.slice(start, end);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateFilteredUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateFilteredUsers();
    }
  }

  updatePage(page: number): void {
    if (page !== this.currentPage) {
      this.currentPage = page;
      this.updateFilteredUsers();
    }
  }

  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
  }
  applyFilters() {
    this.filteredUsers = this.users.filter(user => {
      const emailVerifiedStr = user.emailVerified ? 'verificado' : 'no verificado';
      return (
        (!this.filters.id || user.id.toString().includes(this.filters.id)) &&
        (!this.filters.email || user.email.toLowerCase().includes(this.filters.email.toLowerCase())) &&
        (!this.filters.stateList || user.stateList.toLowerCase().includes(this.filters.stateList.toLowerCase())) &&
        (!this.filters.emailVerified || emailVerifiedStr.includes(this.filters.emailVerified.toLowerCase()))
      );
    });
  }
}
