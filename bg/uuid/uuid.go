package main

import (
	"fmt"
	"log"

	"github.com/google/uuid"
)

func main() {
	// 產生新的 UUID v4
	id := uuid.New()
	log.Println("UUID v4:", id.String())

	// 產生 UUID 並轉成 byte slice
	idBytes := id[:]
	fmt.Printf("UUID bytes: %x\n", idBytes)

	// 從字串轉回 UUID
	parsed, err := uuid.Parse(id.String())
	if err != nil {
		panic(err)
	}
	log.Println("Parsed UUID:", parsed)
}
