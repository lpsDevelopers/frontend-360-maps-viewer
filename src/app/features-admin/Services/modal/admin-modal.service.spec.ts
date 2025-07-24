import { TestBed } from '@angular/core/testing';

import { AdminModalService } from './admin-modal.service';

describe('AdminModalService', () => {
  let service: AdminModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
