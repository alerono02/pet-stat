CREATE TABLE pets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
    breed TEXT,
    birth_date DATE NOT NULL,
    weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0),
    owner_name TEXT
);

CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    pet_id INT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    diagnosis TEXT,
    treatment TEXT,
    vaccination TEXT,
    notes TEXT
);

-- взрослая собака (~40 мес.), котёнок (~7 мес.), пожилая собака (~105 мес.)
INSERT INTO pets (name, species, breed, birth_date, weight_kg, owner_name) VALUES
    ('Рекс', 'dog', 'Лабрадор', '2023-06-15', 28.50, 'Иванов А.'),
    ('Мурка', 'cat', 'Британская', '2026-03-01', 2.80, 'Петрова М.'),
    ('Барбос', 'dog', 'Овчарка', '2018-01-15', 32.00, 'Сидоров К.');

INSERT INTO medical_records (pet_id, visit_date, diagnosis, treatment, vaccination, notes) VALUES
    (1, '2025-11-10', 'Отит', 'Капли в уши 7 дней', NULL, 'Контроль через неделю'),
    (1, '2026-03-20', NULL, NULL, 'Бешенство', 'Плановая вакцинация'),
    (2, '2026-05-12', 'Гельминты', 'Празиквантел', NULL, 'Повтор через 14 дней'),
    (2, '2026-08-01', NULL, NULL, 'Комплексная', 'Первая вакцинация'),
    (3, '2026-01-05', 'Артрит', 'НПВС, хондропротекторы', NULL, 'Ограничить нагрузки');
