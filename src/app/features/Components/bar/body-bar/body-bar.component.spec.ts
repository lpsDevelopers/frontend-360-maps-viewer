import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodyBarComponent } from './body-bar.component';

describe('BodyBarComponent', () => {
  let component: BodyBarComponent;
  let fixture: ComponentFixture<BodyBarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BodyBarComponent]
    });
    fixture = TestBed.createComponent(BodyBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
