import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCompanyBucketsComponent } from './admin-company-buckets.component';

describe('AdminCompanyBucketsComponent', () => {
  let component: AdminCompanyBucketsComponent;
  let fixture: ComponentFixture<AdminCompanyBucketsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminCompanyBucketsComponent]
    });
    fixture = TestBed.createComponent(AdminCompanyBucketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
