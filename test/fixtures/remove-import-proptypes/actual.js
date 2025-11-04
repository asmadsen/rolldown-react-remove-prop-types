import PropTypes from "prop-types";
import React, { Component } from "react";

class Greeting extends Component {
	render() {
		return <h1>Hello, {this.props.name}</h1>;
	}
}

Greeting.propTypes = {
	name: PropTypes.string,
};
