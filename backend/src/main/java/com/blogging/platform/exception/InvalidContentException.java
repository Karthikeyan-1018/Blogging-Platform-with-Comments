package com.blogging.platform.exception;

public class InvalidContentException extends RuntimeException {
    public InvalidContentException(String message) {
        super(message);
    }
}
