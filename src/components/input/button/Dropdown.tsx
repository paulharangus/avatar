import {useState} from "react";
import {Dropdown} from "semantic-ui-react";

export const DropdownSelectionButton = ({ onSelectChange,options,name }:any) => {
    const [selectedCountry, setSelectedCountry] = useState('');

    const handleChange = (e:any, { value }:any) => {
        setSelectedCountry(value);
        onSelectChange(value);
    };

    return (
        <Dropdown
            placeholder= {name}
            fluid
            search
            selection
            options={options}
            onChange={handleChange}
            value={selectedCountry}
        />
    );
};