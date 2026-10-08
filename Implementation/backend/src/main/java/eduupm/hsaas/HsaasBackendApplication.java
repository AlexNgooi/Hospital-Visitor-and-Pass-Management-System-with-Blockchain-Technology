package eduupm.hsaas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Starts the modular backend; integrations are governed by validated server modes. */
@SpringBootApplication
public class HsaasBackendApplication {

	/** Delegates lifecycle and dependency creation to Spring Boot. */
	public static void main(String[] args) {
		SpringApplication.run(HsaasBackendApplication.class, args);
	}

}
