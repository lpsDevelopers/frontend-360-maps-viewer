import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminHotspotsComponent } from './admin-hotspots.component';

describe('AdminHotspotsComponent', () => {
  let component: AdminHotspotsComponent;
  let fixture: ComponentFixture<AdminHotspotsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminHotspotsComponent]
    });
    fixture = TestBed.createComponent(AdminHotspotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
