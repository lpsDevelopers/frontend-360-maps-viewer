import { TestBed } from '@angular/core/testing';

import { AdminLoadingService } from './admin-loading.service';

describe('AdminLoadingService', () => {
  let service: AdminLoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminLoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
