import { TestBed } from '@angular/core/testing';

import { GeoUtilsService} from './geo-utils-service.service';

describe('GeoUtilsServiceService', () => {
  let service: GeoUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeoUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
