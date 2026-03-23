import { Container, Flex, Stack, Text, Box, Divider } from "@mantine/core";
import { Decoder } from "./Decoder";
import { Encoder } from "./components/Encoder";

function App() {
  return (
    <Container strategy="block" size="xl" p="sm" style={{ height: "100vh", overflow: "auto" }}>
      <Stack gap="sm" style={{ height: "100%" }}>
        {/* Header */}
        <Flex align="center" justify="space-between">
          <Text size="xl" fw={700}>
            CW Master
          </Text>
          <Text size="xs" c="dimmed">
            Deep Learning + Bayesian Decoder
          </Text>
        </Flex>

        {/* Main Content - Stacked Layout */}
        <Flex direction="column" gap="sm" style={{ flex: 1, minHeight: 0 }}>
          {/* Decoder Section - Top */}
          <Box style={{ flex: "1 1 55%", minHeight: 0 }}>
            <Decoder />
          </Box>

          <Divider label="ENCODER" labelPosition="center" color="dark.5" />

          {/* Encoder Section - Bottom */}
          <Box style={{ flex: "0 0 auto" }}>
            <Encoder />
          </Box>
        </Flex>

        {/* Footer */}
        <Flex justify="center">
          <Text component="a" c="dimmed" href="https://github.com/e04/" size="xs">
            Based on web-deep-cw-decoder by e04
          </Text>
        </Flex>
      </Stack>
    </Container>
  );
}

export default App;
