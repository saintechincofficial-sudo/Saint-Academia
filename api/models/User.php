<?php
class User {
    public int $id;
    public string $email;
    public string $role;
    public string $name;

    public function __construct(int $id, string $email, string $role, string $name) {
        $this->id = $id;
        $this->email = $email;
        $this->role = $role;
        $this->name = $name;
    }

    public static function fromArray(array $data): self {
        return new self(
            (int) ($data['id'] ?? 0),
            (string) ($data['email'] ?? ''),
            (string) ($data['role'] ?? DEFAULT_ROLE),
            (string) ($data['name'] ?? '')
        );
    }
}
