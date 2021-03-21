import { RegistrableComponent } from "../useRegistrations";
import { PassFieldKeys } from "../../../constants";

export default interface PrimaryFieldsProps extends RegistrableComponent {
	fields?: PassFieldKeys[];
}
