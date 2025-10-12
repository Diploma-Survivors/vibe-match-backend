import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const IS_AFTER_NOW = 'isAfterNow';

@ValidatorConstraint({ name: IS_AFTER_NOW, async: false })
export class IsAfterNowValidator implements ValidatorConstraintInterface {
  validate(value: Date): Promise<boolean> | boolean {
    if (!(value instanceof Date)) {
      return false;
    }

    const now = new Date();
    return value > now;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return `${validationArguments?.property} must be a date in the future`;
  }
}
