import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { UiWindowComponent } from './ui-window.component';

describe('UiWindowComponent', () => {
  let component: UiWindowComponent;
  let fixture: ComponentFixture<UiWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiWindowComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(UiWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close event when onClose is called', () => {
    let emitted = false;
    component.close.subscribe(() => {
      emitted = true;
    });
    component.onClose();
    expect(emitted).toBeTrue();
  });
});
