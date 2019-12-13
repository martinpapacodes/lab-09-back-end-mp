DROP TABLE IF EXISTS locations;

CREATE TABLE locations(
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude  DECIMAL,
    longitude DECIMAL
);

-- Execute this file from the command line with the following syntax: `psql -d <database-name> -f <path/to/filename>`