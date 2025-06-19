import { TestBed } from '@angular/core/testing';

import { VrThreeService } from './vr-three.service';

describe('VrThreeService', () => {
  let service: VrThreeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VrThreeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
