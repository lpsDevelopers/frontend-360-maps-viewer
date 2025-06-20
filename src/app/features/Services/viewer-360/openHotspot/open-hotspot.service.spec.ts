import { TestBed } from '@angular/core/testing';

import { OpenHotspotService } from './open-hotspot.service';

describe('OpenHotspotService', () => {
  let service: OpenHotspotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenHotspotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
