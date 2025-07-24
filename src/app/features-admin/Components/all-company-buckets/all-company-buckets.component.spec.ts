import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllCompanyBucketsComponent } from './all-company-buckets.component';

describe('AllCompanyBucketsComponent', () => {
  let component: AllCompanyBucketsComponent;
  let fixture: ComponentFixture<AllCompanyBucketsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllCompanyBucketsComponent]
    });
    fixture = TestBed.createComponent(AllCompanyBucketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
