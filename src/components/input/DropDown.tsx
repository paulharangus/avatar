import React, { useState } from 'react';
import { Dropdown } from 'semantic-ui-react';

const countryOptions = [
    { key: 'ro-RO', value: 'ro-RO', flag: 'ro', text: 'Romanian' },
    { key: 'it', value: 'it-IT', flag: 'it', text: 'Italian' },
    { key: 'it-IT', value: 'de-DE', flag: 'de', text: 'German' },
    { key: 'en-US', value: 'en-US', flag: 'uk', text: 'English' },
    { key: 'fr-FR', value: 'fr-FR', flag: 'fr', text: 'French' },
];

const DropdownButton = ({ onSelectChange }:any) => {
    const [selectedCountry, setSelectedCountry] = useState('');

    const handleChange = (e:any, { value }:any) => {
        setSelectedCountry(value);
        onSelectChange(value);
    };

    return (
        <Dropdown
            placeholder='Select Country'
            fluid
            search
            selection
            options={countryOptions}
            onChange={handleChange}
            value={selectedCountry}
        />
    );
};

export default DropdownButton;