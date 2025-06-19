import { TestBed } from '@angular/core/testing';

import { GeoUtilsServiceService } from './geo-utils-service.service';

describe('GeoUtilsServiceService', () => {
  let service: GeoUtilsServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeoUtilsServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
