import { TestBed } from '@angular/core/testing';

import { NavigationTrackerService } from './navigation-tracker.service';

describe('NavigationTrackerService', () => {
  let service: NavigationTrackerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavigationTrackerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
