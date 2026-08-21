package com.kurage.api;

import com.mongodb.client.MongoClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("context-test")
class ApiApplicationTests {

	@MockitoBean
	private MongoClient mongoClient;

	@Test
	void applicationContextStartsWithAllNonLazySingletons() {
	}

}
