import { TestBed } from '@angular/core/testing';

import { AdminEndpointService } from './admin-endpoint.service';

describe('AdminEndpointService', () => {
  let service: AdminEndpointService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminEndpointService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
