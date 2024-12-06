import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const useOnLocationChange = (handleLocationChange: any) => {
	const location = useLocation();
	const navigationType = useNavigationType();

	useEffect(() => {
		return () => (handleLocationChange && handleLocationChange(location, navigationType));
	}, [location, handleLocationChange]);
};

export default useOnLocationChange;