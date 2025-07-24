import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLocationsComponent } from './admin-locations.component';

describe('AdminLocationsComponent', () => {
  let component: AdminLocationsComponent;
  let fixture: ComponentFixture<AdminLocationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminLocationsComponent]
    });
    fixture = TestBed.createComponent(AdminLocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
