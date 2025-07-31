import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanoramaLevelerComponent } from './panorama-leveler.component';

describe('PanoramaLevelerComponent', () => {
  let component: PanoramaLevelerComponent;
  let fixture: ComponentFixture<PanoramaLevelerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PanoramaLevelerComponent]
    });
    fixture = TestBed.createComponent(PanoramaLevelerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
