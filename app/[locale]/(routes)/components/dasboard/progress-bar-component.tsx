"use client"
import React from 'react';
import {ProgressBar, ProgressBarProps} from "@tremor/react";

interface ProgressBarComponentProps extends ProgressBarProps {
}

const ProgressBarComponent = (props : ProgressBarComponentProps) => {
    return (
            <ProgressBar {...props} />
    );
};

export default ProgressBarComponent;