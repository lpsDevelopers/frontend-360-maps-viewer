import { TestBed } from '@angular/core/testing';

import { StoredPanoramasService } from './stored-panoramas.service';

describe('StoredPanoramasService', () => {
  let service: StoredPanoramasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StoredPanoramasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
