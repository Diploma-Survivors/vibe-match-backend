import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DeadlineEnforcement } from '../enums/deadline-enforcement.enum';

const IS_VALID_LATE_DEADLINE = 'IsValidLateDeadline';

@ValidatorConstraint({
  name: IS_VALID_LATE_DEADLINE,
  async: false,
})
export class IsValidLateDeadlineValidator
  implements ValidatorConstraintInterface
{
  validate(value: Date | null | undefined, args: ValidationArguments) {
    const durationMinutes = args?.object?.['durationMinutes'] as
      | number
      | undefined;
    const deadlineEnforcement = args?.object?.['deadlineEnforcement'] as
      | DeadlineEnforcement
      | undefined;

    if (value != null) {
      return (
        durationMinutes == null &&
        deadlineEnforcement === DeadlineEnforcement.FLEXIBLE
      );
    }

    return true;
  }

  defaultMessage() {
    return 'lateDeadline set requires durationMinutes to be null and deadlineEnforcement to be FLEXIBLE';
  }
}
