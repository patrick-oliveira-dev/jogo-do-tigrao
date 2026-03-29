package com.tigrao.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAllExceptions(Exception ex) {
        // Envia a string crua do erro de volta pro aplicativo Mobile ler no Alert
        return ResponseEntity.status(500).body(ex.getMessage() != null ? ex.getMessage() : ex.toString());
    }
}
