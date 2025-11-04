import map from "lodash/map";
import React, { PropTypes } from "react";

var Message = ({ mapList }) => {
	return map(mapList, (index) => {
		return <div />;
	});
};

Message.propTypes = {
	mapList: PropTypes.array.isRequired,
};

export default Message;
