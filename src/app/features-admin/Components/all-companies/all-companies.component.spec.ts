import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllCompaniesComponent } from './all-companies.component';

describe('AllCompaniesComponent', () => {
  let component: AllCompaniesComponent;
  let fixture: ComponentFixture<AllCompaniesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllCompaniesComponent]
    });
    fixture = TestBed.createComponent(AllCompaniesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
