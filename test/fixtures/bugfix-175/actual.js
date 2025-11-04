import PropTypes from "prop-types";
import React from "react";

const sharedPropType = PropTypes.number;

export default class Foo extends React.Component {
	static propTypes = {
		bar: sharedPropType,
	};
}
