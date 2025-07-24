import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPanoramasComponent } from './admin-panoramas.component';

describe('AdminPanoramasComponent', () => {
  let component: AdminPanoramasComponent;
  let fixture: ComponentFixture<AdminPanoramasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminPanoramasComponent]
    });
    fixture = TestBed.createComponent(AdminPanoramasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
