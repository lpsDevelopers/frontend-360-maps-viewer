import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsvLocationsComponent } from './csv-locations.component';

describe('CsvLocationsComponent', () => {
  let component: CsvLocationsComponent;
  let fixture: ComponentFixture<CsvLocationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CsvLocationsComponent]
    });
    fixture = TestBed.createComponent(CsvLocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
